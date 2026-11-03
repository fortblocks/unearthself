// Nitro configuration for Vercel deployment
// https://nitro.unjs.io/deploy/providers/vercel

export default {
  vercel: {
    functions: {
      maxDuration: 120, // 120 seconds for all functions (server functions and routes)
    },
  },
};
