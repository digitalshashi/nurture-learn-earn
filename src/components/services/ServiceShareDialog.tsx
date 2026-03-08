import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, MessageCircle, Mail, Send, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ServiceShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceTitle: string;
  serviceId: string;
  slug: string | null;
}

export function ServiceShareDialog({ open, onOpenChange, serviceTitle, serviceId, slug }: ServiceShareDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const baseUrl = window.location.origin;
  const serviceUrl = `${baseUrl}/checkout/${slug || serviceId}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(serviceUrl);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`Check out ${serviceTitle}: ${serviceUrl}`)}`, "_blank");
  };

  const shareEmail = () => {
    window.open(`mailto:?subject=${encodeURIComponent(serviceTitle)}&body=${encodeURIComponent(`Check out this: ${serviceUrl}`)}`, "_blank");
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(serviceUrl)}&text=${encodeURIComponent(serviceTitle)}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Share Service</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-2">{serviceTitle}</p>

        <div className="flex items-center gap-2">
          <Input readOnly value={serviceUrl} className="text-xs bg-muted" />
          <Button variant="outline" size="icon" onClick={copyLink} className="shrink-0">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button variant="outline" className="gap-2 text-sm" onClick={shareWhatsApp}>
            <MessageCircle className="h-4 w-4 text-green-500" /> WhatsApp
          </Button>
          <Button variant="outline" className="gap-2 text-sm" onClick={shareEmail}>
            <Mail className="h-4 w-4 text-blue-500" /> Email
          </Button>
          <Button variant="outline" className="gap-2 text-sm" onClick={shareTelegram}>
            <Send className="h-4 w-4 text-sky-500" /> Telegram
          </Button>
          <Button variant="outline" className="gap-2 text-sm" onClick={() => setShowQr(!showQr)}>
            <QrCode className="h-4 w-4" /> QR Code
          </Button>
        </div>

        {showQr && (
          <div className="flex justify-center p-4 bg-muted rounded-lg mt-2">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(serviceUrl)}`}
              alt="QR Code"
              className="w-[180px] h-[180px]"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
