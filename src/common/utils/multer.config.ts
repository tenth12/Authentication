import { MulterModuleAsyncOptions } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { BadRequestException } from '@nestjs/common';

interface MulterImageOptions {
  maxSize: number;
  allowedMimeTypes: string[];
}

export const multerConfigFactory = (
  folderName: string,
  options: MulterImageOptions,
): MulterModuleAsyncOptions => ({
  useFactory: async () => {
    const uploadRoot = process.env.UPLOAD_DEST || './uploads';
    const uploadPath = path.join(uploadRoot, folderName);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    return {
      storage: diskStorage({
        destination: (_req, _file, cb) => cb(null, uploadPath),
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `${uuidv4()}${ext}`);
        },
      }),
      limits: { fileSize: options.maxSize },
      fileFilter: (_req, file, cb) => {
        if (!options.allowedMimeTypes.includes(file.mimetype)) {
          return cb(new BadRequestException('Invalid file type'), false);
        }
        cb(null, true);
      },
    };
  },
});
