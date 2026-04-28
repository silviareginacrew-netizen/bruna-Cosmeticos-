import ImageKit from "imagekit";
import { VercelRequest, VercelResponse } from '@vercel/node';

const imagekit = new ImageKit({
  publicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY || "public_z105SGDbqJHY6O2e/RIw7viRVpo=",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_ydf8z/Qzldlr2llv2fq8g3G2DxQ=",
  urlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/bruna"
});

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authParams = imagekit.getAuthenticationParameters();
    res.status(200).json(authParams);
  } catch (error) {
    console.error('ImageKit Auth Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
