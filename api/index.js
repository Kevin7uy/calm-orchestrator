export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    message: "Your Vercel backend is running correctly!"
  });
}
