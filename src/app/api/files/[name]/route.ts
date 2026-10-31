// Images are no longer served from this server. Uploads go to Vercel Blob, and the product
// rows store the Blob URLs directly. Old "/api/files/..." URLs from the previous local
// storage are dead on purpose — re-upload the images if you still need them.
export const GET = () => new Response("Not found", { status: 404 });
