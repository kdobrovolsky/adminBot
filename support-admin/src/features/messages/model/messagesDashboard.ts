import type { DialogViewModel, ManagerSummary } from "@/types/message";

export type DialogFilterId = "all" | "mine" | "unassigned" | "assignedToOthers" | "closed";

export type AvailabilityState = {
  hint: string;
};

export type AssignmentAvailability = AvailabilityState & {
  canTake: boolean;
};

export type ClientStatus = AvailabilityState & {
  label: string;
  toneClassName: string;
};

export type CloseAvailability = AvailabilityState & {
  canClose: boolean;
};

export type DialogFilterOption = {
  id: DialogFilterId;
  label: string;
};

export type ManagerOption = {
  id: ManagerSummary["id"];
  label: string;
};

export type ReleaseAvailability = AvailabilityState & {
  canRelease: boolean;
};

export type ReplyAvailability = AvailabilityState & {
  canReply: boolean;
};

export type ReopenAvailability = AvailabilityState & {
  canReopen: boolean;
};

export type DialogListTone = "assigned" | "closed" | "mine" | "unassigned";

export type DialogListItemViewModel = {
  assignedLabel: string;
  dialog: DialogViewModel;
  preview: string;
  statusTone: DialogListTone;
};
