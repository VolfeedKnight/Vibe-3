export type HealthResponse = {
  status: "ok";
  service: string;
  message: string;
};

export type StatusResponse = {
  app: string;
  modules: string[];
};
