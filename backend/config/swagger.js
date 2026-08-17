const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "Nikola API",
    version: "1.0.0",
    description: "Nikola backend API (versioned).",
  },
  servers: [
    { url: "/api", description: "Local API base path" }
  ],
  paths: {},
};

export default swaggerSpec;
