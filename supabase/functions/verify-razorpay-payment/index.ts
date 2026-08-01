import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      service_id,
      amount,
      custom_fields_data,
    } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !service_id) {
      return new Response(JSON.stringify({ error: "Missing payment details" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get coach's Razorpay secret for signature verification
    const { data: service } = await adminClient
      .from("services")
      .select("coach_id, title")
      .eq("id", service_id)
      .single();

    if (!service) {
      return new Response(JSON.stringify({ error: "Service not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await adminClient
      .from("coach_payment_settings")
      .select("razorpay_key_secret")
      .eq("coach_id", service.coach_id)
      .single();

    if (!settings?.razorpay_key_secret) {
      return new Response(JSON.stringify({ error: "Payment config missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify signature using HMAC SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(settings.razorpay_key_secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureData = `${razorpay_order_id}|${razorpay_payment_id}`;
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(signatureData));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      return new Response(JSON.stringify({ error: "Invalid payment signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Payment verified! Grant access
    // 1. Insert service_user
    const { error: suError } = await adminClient.from("service_users").insert({
      service_id,
      user_id: userId,
      status: "active",
      amount_paid: amount || 0,
      payment_method: "razorpay",
      transaction_id: razorpay_payment_id,
      custom_fields_data: custom_fields_data || null,
    });

    if (suError) {
      console.error("service_users insert error:", suError);
      return new Response(
        JSON.stringify({ error: "Payment verified but failed to grant access. Contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Auto-enroll in linked courses
    const { data: linkedCourses } = await adminClient
      .from("service_courses")
      .select("course_id")
      .eq("service_id", service_id);

    if (linkedCourses && linkedCourses.length > 0) {
      const enrollments = linkedCourses.map((c: any) => ({
        course_id: c.course_id,
        user_id: userId,
      }));
      const { error: enrollError } = await adminClient.from("enrollments").insert(enrollments);
      if (enrollError) console.error("enrollments insert error:", enrollError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Payment verified and access granted" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
