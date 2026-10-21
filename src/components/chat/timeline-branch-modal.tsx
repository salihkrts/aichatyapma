"use client";

import { useState } from "react";
import { GitBranch, Sparkles, Loader2, Split } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createTimelineBranchAction } from "@/app/actions/chat";
import type { ChatMessage } from "@/components/chat/chat-message-item";

interface TimelineBranchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentChatId: string;
  branchPointMessage: ChatMessage | null;
  onBranchCreated: (newChatId: string) => void;
}

export function TimelineBranchModal({
  open,
  onOpenChange,
  parentChatId,
  branchPointMessage,
  onBranchCreated,
}: TimelineBranchModalProps) {
  const [branchLabel, setBranchLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBranch = async () => {
    if (!branchPointMessage) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await createTimelineBranchAction({
        parentChatId,
        branchPointMessageId: branchPointMessage.id,
        branchLabel: branchLabel.trim() || undefined,
      });

      if (res.success && res.data?.newChatId) {
        onOpenChange(false);
        setBranchLabel("");
        onBranchCreated(res.data.newChatId);
      } else {
        setError(res.error || "Failed to create timeline branch.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating branch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-neutral-900 border border-white/10 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="size-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <GitBranch className="size-4" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Branch Timeline (Git for Chat)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-neutral-400">
            Fork this conversation from this exact turning point into a parallel universe. All messages prior to this moment will be cloned into the new timeline without altering the current one.
          </DialogDescription>
        </DialogHeader>

        {/* Message preview snippet */}
        {branchPointMessage && (
          <div className="my-2 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block mb-1">
              Divergence Point ({branchPointMessage.role})
            </span>
            <p className="text-neutral-300 line-clamp-3 italic">
              &ldquo;{branchPointMessage.content}&rdquo;
            </p>
          </div>
        )}

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="branchLabel" className="text-xs font-semibold text-neutral-300">
              Timeline Name / Decision Note
            </Label>
            <Input
              id="branchLabel"
              value={branchLabel}
              onChange={(e) => setBranchLabel(e.target.value)}
              placeholder="e.g. Timeline B: Refused the oath, or What if I told the truth?"
              className="mt-1.5 bg-black/40 border-white/10 text-xs text-white placeholder:text-neutral-600"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-neutral-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleBranch}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                Spawning Timeline...
              </>
            ) : (
              <>
                <Split className="size-3.5 mr-1.5" />
                Fork New Timeline
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
