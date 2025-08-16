import mongoose from 'mongoose'
import { Readable } from 'stream'

let bucket: any = null

export type GridFSFile = {
  id: string
  filename: string
  contentType: string
  size: number
}

// Initialize the GridFS bucket
export const initGridFS = (): void => {
  if (!mongoose.connection.db) {
    throw new Error('Database connection not established')
  }

  try {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    })
    console.log('GridFS initialized')
  } catch (error) {
    console.error('Failed to initialize GridFS:', error)
    throw error
  }
}

export const uploadFile = async (file: Express.Multer.File): Promise<GridFSFile> => {
  if (!bucket) {
    initGridFS()
  }

  if (!bucket) {
    throw new Error('GridFS not initialized')
  }

  return new Promise((resolve, reject) => {
    try {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      const filename = uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_')

      console.log('Creating readable stream from buffer', {
        bufferExists: !!file.buffer,
        bufferLength: file.buffer ? file.buffer.length : 0,
      })

      const readableStream = new Readable({
        read() {
          this.push(file.buffer)
          this.push(null)
        },
      })

      const uploadStream = bucket.openUploadStream(filename, {
        contentType: file.mimetype,
        metadata: {
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          size: file.size,
        },
      })

      uploadStream.on('finish', function () {
        console.log('GridFS upload finished successfully')
        resolve({
          id: uploadStream.id.toString(),
          filename: filename,
          contentType: file.mimetype,
          size: file.size,
        })
      })

      uploadStream.on('error', function (error: Error) {
        console.error('GridFS upload error:', error)
        reject(error)
      })

      readableStream.pipe(uploadStream)
    } catch (error) {
      console.error('Error in uploadFile:', error)
      reject(error)
    }
  })
}

// Get a file from GridFS
export const getFile = async (filename: string) => {
  if (!bucket) {
    initGridFS()
  }

  if (!bucket) {
    throw new Error('GridFS not initialized')
  }

  try {
    return bucket.openDownloadStreamByName(filename)
  } catch (error) {
    console.error(`Error getting file ${filename}:`, error)
    throw new Error(`File not found: ${filename}`)
  }
}

// Delete a file from GridFS
export const deleteFile = async (filename: string): Promise<void> => {
  if (!bucket || !mongoose.connection.db) {
    initGridFS()
  }

  if (!bucket || !mongoose.connection.db) {
    throw new Error('GridFS not initialized')
  }

  try {
    // Find the file by filename
    const files = await mongoose.connection.db.collection('uploads.files').find({ filename }).toArray()

    if (files.length === 0) {
      throw new Error(`File not found: ${filename}`)
    }

    // Delete the file
    await bucket.delete(files[0]._id)
  } catch (error) {
    console.error(`Error deleting file ${filename}:`, error)
    throw error
  }
}

// Check if a file exists
export const fileExists = async (filename: string): Promise<boolean> => {
  if (!mongoose.connection.db) {
    return false
  }

  try {
    const files = await mongoose.connection.db.collection('uploads.files').find({ filename }).toArray()
    return files.length > 0
  } catch (error) {
    console.error(`Error checking if file ${filename} exists:`, error)
    return false
  }
}
