import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import multer from "multer";
import fs from "fs/promises";
import sgMail from "@sendgrid/mail";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const upload = multer({ dest: "uploads/" });

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use("/send", limiter);
app.use(express.static(join(__dirname, "../")));

// helper: send via SendGrid
async function sendMail(to, subject, html, attachments = []) {
  const msg = {
    to,
    from: process.env.OWNER_EMAIL, // must be a verified sender or on an authenticated domain
    subject,
    html,
    attachments: attachments.length ? attachments : undefined,
  };
  return sgMail.send(msg);
}

// Feedback route
app.post(
  "/send/feedback",
  [
    body("name").trim().escape().notEmpty(),
    body("email").isEmail().normalizeEmail(),
    body("message").trim().escape().notEmpty(),
  ],
  async (req, res) => {
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).json({ ok: false, errors: errs.array() });
    const { name, email, message } = req.body;
    const html = `<h3>VIP Club Feedback</h3>
                  <p><strong>Name:</strong> ${name}<br>
                     <strong>Email:</strong> ${email}</p>
                  <p><strong>Message:</strong><br>${message}</p>`;
    try {
      await sendMail(process.env.OWNER_EMAIL, `VIP Feedback from ${name}`, html);
      res.json({ ok: true });
    } catch (e) {
      console.error("SendGrid error:", e);
      res.status(500).json({ ok: false, msg: "Mail error" });
    }
  }
);

// Booking route — supports file attachments (multer)
app.post(
  "/send/booking",
  upload.array("image"),
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
    if (!errs.isEmpty()) return res.status(400).json({ ok: false, errors: errs.array() });
    const { car, service, phone, time, email, comment } = req.body;
    const date = new Date(time).toLocaleString("en-GB", { hour12: false });
    const html = `<h3>New Booking</h3>
                  <p><strong>Car:</strong> ${car}<br>
                     <strong>Service:</strong> ${service}<br>
                     <strong>Phone:</strong> ${phone}<br>
                     <strong>Preferred time:</strong> ${date}</p>
                  <p><strong>Comment:</strong> ${comment || "None"}</p>`;

    // convert multer files to SendGrid attachments (base64)
    let attachments = [];
    try {
      if (req.files && req.files.length) {
        attachments = await Promise.all(
          req.files.map(async (file) => {
            const data = await fs.readFile(file.path);
            // optional: remove file after reading
            await fs.unlink(file.path).catch(() => {});
            return {
              content: data.toString("base64"),
              filename: file.originalname,
              type: file.mimetype,
              disposition: "attachment",
            };
          })
        );
      }

      await sendMail(process.env.OWNER_EMAIL, `Booking: ${car}`, html, attachments);
      res.json({ ok: true });
    } catch (e) {
      console.error("SendGrid booking error:", e);
      res.status(500).json({ ok: false, msg: "Mail error" });
    }
  }
);

app.get("*", (_, res) => res.sendFile(join(__dirname, "../index.html")));
app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
