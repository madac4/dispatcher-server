import { Router } from 'express'
import { sendContactForm } from '../controllers/contact.controller'

const ContactRoutes: Router = Router()

ContactRoutes.post('/send', sendContactForm)

export default ContactRoutes
