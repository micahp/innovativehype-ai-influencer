export type PublishInput = {
  accessToken: string;
  accountId: string;
  caption: string;
  mediaUrl?: string | null;
  graphVersion?: string;
};

export type PublishResult = {
  externalPostId: string;
  postUrl?: string;
  result: Record<string, unknown>;
};

export class PublisherError extends Error {
  constructor(message: string, readonly ambiguous: boolean, readonly status?: number) {
    super(message);
    this.name = "PublisherError";
  }
}

export type Publisher = (input: PublishInput) => Promise<PublishResult>;
