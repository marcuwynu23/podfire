export type Repo = {
  id: number;
  full_name: string;
  clone_url: string;
  default_branch: string;
};

export type Branch = { name: string };

export type EnvEntry = { key: string; value: string };

export type CreateAppFormProps = {
  cancelHref?: string;
  contained?: boolean;
};
