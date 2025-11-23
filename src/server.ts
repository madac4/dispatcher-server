import bodyParser from 'body-parser'
import cors from 'cors'
import dotenv from 'dotenv'
import express, { Express, Request, Response } from 'express'
import { createServer } from 'http'
import connectDB from './config/db'
import AuthRoutes from './routes/auth.routes'
import ChatRoutes from './routes/chat.routes'
import ContactRoutes from './routes/contact.routes'
import DashboardRoutes from './routes/dashboard.routes'
import InvoiceRoutes from './routes/invoice.routes'
import NotificationRoutes from './routes/notification.routes'
import OrderRoutes from './routes/order.routes'
import SettingsRoutes from './routes/settings.routes'
import TrailerRoutes from './routes/trailer.routes'
import TruckRoutes from './routes/truck.routes'
import { initGridFS } from './services/gridfs.service'
import { socketService } from './services/socket.service'
import { globalErrorHandler } from './utils/ErrorHandler'

dotenv.config()

const app: Express = express()
const server = createServer(app)
const port = parseInt(process.env.PORT || '3000', 10)

connectDB().then(() => {
	initGridFS()
})

socketService.initialize(server)

app.use(
	cors({
		credentials: true,
		origin: function (origin, callback) {
			if (!origin) return callback(null, true)

			if (process.env.FRONTEND_ORIGINS) {
				if (process.env.FRONTEND_ORIGINS.indexOf(origin) === -1) {
					const msg = `This site ${origin} does not have an access. Only specific domains are allowed to access it.`
					return callback(new Error(msg), false)
				}
			}
			return callback(null, true)
		},
	}),
)

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }))

app.get('/health', (req: Request, res: Response) => {
	res.status(200).json({ status: 'ok', message: 'Server is running' })
})

const jsonParser = bodyParser.json({ limit: '50mb' })

app.use('/api/notifications', jsonParser, NotificationRoutes)
app.use('/api/dashboard', jsonParser, DashboardRoutes)
app.use('/api/authorization', jsonParser, AuthRoutes)
app.use('/api/settings', jsonParser, SettingsRoutes)
app.use('/api/trailers', jsonParser, TrailerRoutes)
app.use('/api/invoices', jsonParser, InvoiceRoutes)
app.use('/api/contact', jsonParser, ContactRoutes)
app.use('/api/trucks', jsonParser, TruckRoutes)
app.use('/api/orders', jsonParser, OrderRoutes)
app.use('/api/chat', jsonParser, ChatRoutes)

app.use(globalErrorHandler)

server.listen(port, () => {
	console.log(`Server is running on port ${port}`)
})
