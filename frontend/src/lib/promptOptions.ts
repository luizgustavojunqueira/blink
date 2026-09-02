export type PromptOptionKind =
  | "COMMAND"
  | "COMMAND_ARG"
  | "MODIFIER"
  | "STATUS"
  | "PRIORITY"
  | "TAG"
  | "ORDER";

export type PromptOption = {
  name: string;
  description: string;
  kind: PromptOptionKind;
  value: string;
};

export function toPromptOption(
  kind: PromptOptionKind,
  opt: Omit<PromptOption, "kind">,
): PromptOption {
  return { ...opt, kind };
}
