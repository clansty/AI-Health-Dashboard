interface Env {
  VPC: Fetcher;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { VPC } = context.env;

  return VPC.fetch('http://internal-api/stats/models');
};
