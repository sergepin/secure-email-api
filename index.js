import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import rateLimit from 'express-rate-limit'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

const allowedOrigin = process.env.ALLOWED_ORIGIN
const isDev = process.env.NODE_ENV === 'development'

// Rate limit configurado según el entorno
const limiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min en dev, 15 en prod
  max: isDev ? 50 : 5, // más requests en dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests' }
})
app.use('/send-email', limiter)

// Middleware de seguridad
app.use((req, res, next) => {
  const origin = req.get('origin') || req.get('referer') || ''
  const apiKey = req.headers['x-api-key']

  if (apiKey !== process.env.API_KEY || (origin && !origin.startsWith(allowedOrigin))) {
    return res.status(403).json({ message: 'Access denied' })
  }

  next()
})

app.post('/send-email', async (req, res) => {
  const { name, email, subject, message } = req.body

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'Invalid request' })
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({ message: 'Internal server error' })
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })

    await transporter.sendMail({
      from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
      to: 'sergepin96@gmail.com',
      replyTo: email,
      subject: `[Portfolio Contact] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    })

    res.status(200).json({ message: 'Message sent' })
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
