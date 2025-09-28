import "dotenv/config";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import multer from "multer";
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const upload = multer({ dest: "uploads/" }); // or configure as needed

app.set("trust proxy", 1); // trust Render’s reverse proxy

// 1. middleware
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// 2. brute-force protection
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use("/send", limiter);

// 3. serve the static front-end
app.use(express.static(join(__dirname, "../")));

// 4. mail transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
function sendMail(to, subject, html) {
  return transporter.sendMail({
    from: `Ararat-Auto Site <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

// 5. routes
app.post(
  "/send/feedback",
  [
    body("name").trim().escape().notEmpty(),
    body("email").isEmail().normalizeEmail(),
    body("message").trim().escape().notEmpty(),
  ],
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty())
      return res.status(400).json({ ok: false, errors: errs.array() });
    const { name, email, message } = req.body;
    const html = `<h3>VIP Club Feedback</h3>
                  <p><strong>Name:</strong> ${name}<br>
                     <strong>Email:</strong> ${email}</p>
                  <p><strong>Message:</strong><br>${message}</p>`;
    try {
      await sendMail(
        process.env.OWNER_EMAIL,
        `VIP Feedback from ${name}`,
        html
      );
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, msg: "Mail error" });
    }
  }
);

app.post(
  "/send/booking",
  upload.array("image"), // <-- allow multiple files
  [
    body("car").trim().escape().notEmpty(),
    body("service").trim().escape().notEmpty(),
    body("phone").trim().escape().notEmpty(),
    body("time").isISO8601(),
    body("email").isEmail().normalizeEmail(),
    body("comment").trim().escape(),
  ],
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty())
      return res.status(400).json({ ok: false, errors: errs.array() });
    const { car, service, phone, time, email, comment } = req.body;
    const date = new Date(time).toLocaleString("en-GB", { hour12: false });
    const html = `<h3>New Booking</h3>
                  <p><strong>Car:</strong> ${car}<br>
                     <strong>Service:</strong> ${service}<br>
                     <strong>Phone:</strong> ${phone}<br>
                     <strong>Preferred time:</strong> ${date}</p>
                  <p><strong>Comment:</strong> ${comment || "None"}</p>`;
    try {
      await transporter.sendMail({
        from: `Ararat-Auto Site <${process.env.SMTP_USER}>`,
        to: process.env.OWNER_EMAIL,
        subject: `Booking: ${car}`,
        html,
        attachments: req.files
          ? req.files.map((file) => ({
              filename: file.originalname,
              path: file.path,
              contentType: file.mimetype,
            }))
          : [],
      });
      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, msg: "Mail error" });
    }
  }
);

// 6. SPA catch-all
app.get("*", (_, res) => res.sendFile(join(__dirname, "../index.html")));
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
