"use client";

import { useTransition } from "react";
import { assignTeamMember, removeTeamMember } from "@/lib/actions/events";
import { Button } from "@/components/ui/button";

interface TeamMemberActionsProps {
  eventId: string;
  availableMembers: Array<{ id: string; full_name: string }>;
  currentMembers: Array<{
    id: string;
    user_id: string;
    full_name: string;
  }>;
}

export function TeamMemberActions({
  eventId,
  availableMembers,
  currentMembers,
}: TeamMemberActionsProps) {
  const [isPending, startTransition] = useTransition();

  function handleAssign(userId: string) {
    startTransition(async () => {
      const result = await assignTeamMember(eventId, userId);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  function handleRemove(membershipId: string) {
    startTransition(async () => {
      const result = await removeTeamMember(eventId, membershipId);
      if (result.error) {
        alert(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {currentMembers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Assigned Team Members</h4>
          <div className="space-y-2">
            {currentMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {member.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium">{member.full_name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleRemove(member.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableMembers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Add Team Member</h4>
          <div className="space-y-2">
            {availableMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                    {member.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <span className="text-sm font-medium">{member.full_name}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleAssign(member.id)}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentMembers.length === 0 && availableMembers.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No team members available to assign.
        </p>
      )}
    </div>
  );
}
