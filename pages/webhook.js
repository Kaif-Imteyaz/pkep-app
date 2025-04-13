export async function getServerSideProps({ res }) {
  res.setHeader('Location', '/api/webhook');
  res.statusCode = 308; // Permanent Redirect
  res.end();

  return {
    props: {},
  };
}

export default function Webhook() {
  return null;
} 