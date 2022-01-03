export interface ILoginCredentials {
  email: string;
  password: string;
}
export interface IProfile {
  id: string;
  username: string;
  plan: string;
  total_comments: number;
  time_saved: string;
  trial_end: string;
}

export enum LoginOption {
  GitHub,
  Email,
}
