import { Loader2Icon } from "lucide-react";

export default function AuthLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
