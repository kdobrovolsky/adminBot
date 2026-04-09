export type AuthFormState = {
  error: string | null;
  success: string | null;
  email: string;
};

export const initialAuthFormState: AuthFormState = {
  error: null,
  success: null,
  email: "",
};
