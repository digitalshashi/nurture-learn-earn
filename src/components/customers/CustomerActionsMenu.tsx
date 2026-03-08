import { MoreHorizontal, ShieldX, Pencil, MessageSquare, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface CustomerActionsMenuProps {
  onRevoke: () => void;
  onEdit: () => void;
  onViewRemarks: () => void;
  onDelete: () => void;
  status: string;
}

export function CustomerActionsMenu({ onRevoke, onEdit, onViewRemarks, onDelete, status }: CustomerActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status === "active" && (
          <DropdownMenuItem onClick={onRevoke} className="text-destructive">
            <ShieldX className="h-4 w-4 mr-2" />Revoke Access
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-2" />Edit Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onViewRemarks}>
          <MessageSquare className="h-4 w-4 mr-2" />View Remarks
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />Delete Customer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
