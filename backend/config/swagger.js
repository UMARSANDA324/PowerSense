const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "PowerSense API",
    version: "1.0.0",
    description: "PowerSense backend API (versioned).",
  },
  servers: [
    { url: "/api", description: "Local API base path" }
  ],
  paths: {},
};

export default swaggerSpec;
