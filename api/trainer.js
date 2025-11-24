export default function handler(req, res) {
  res.status(200).json({
    trainer: "running",
    message: "AI Trainer is ready to run daily tasks"
  });
}
