import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { safeUnlinkByRelativePath } from '../common/utils/file.utils';
import type { Express } from 'express';

@Injectable()
export class ProductsService {
  // Inject Product Model เข้ามาใช้งาน โดยเก็บไว้ในตัวแปรชื่อ productModel
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
  ) { }

  // --- Helper: Convert Disk Path to Public URL ---
  // --- Helper: Convert Disk Path to Public URL ---
  private toPublicImagePath(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/'); 
    // Find where 'uploads/' starts to handle absolute paths (e.g., D:/project/uploads/...)
    const uploadIndex = normalized.indexOf('uploads/');
    if (uploadIndex !== -1) {
      return normalized.substring(uploadIndex);
    }
    // Fallback if 'uploads/' is not found (unlikely with our current config)
    return `uploads/${normalized}`;
  }

  // --- สร้างสินค้า (Create) ---
  async create(dto: CreateProductDto, files?: Array<Express.Multer.File>): Promise<Product> {
    console.log('--- Create Product ---');
    console.log('DTO:', dto);
    console.log('Files:', files);

    const imageUrls = files
      ? files.map(file => this.toPublicImagePath(file.path.replace(/\\/g, '/')))
      : [];

    try {
      return await this.productModel.create({
        ...dto,
        imageUrls,
      });
    } catch (err) {
      // ลบไฟล์ทั้งหมดถ้า Insert ไม่ผ่าน
      if (files?.length) {
        await Promise.all(
          files.map(f => safeUnlinkByRelativePath(f.path.replace(/\\/g, '/')))
        );
      }
      throw new InternalServerErrorException('Create product failed');
    }
  }

  // --- ดึงข้อมูลทั้งหมด (Read All) ---
  // Promise = สัญญาว่าจะคืนค่าในอนาคต (หลังจากรอการทำงานของ Database เสร็จ)
  async findAll(query: any): Promise<Product[]> {
    const { name, minPrice, maxPrice, sort, order } = query;
    const filter: any = {};

    // ค้นหาตามชื่อ (Partial Match)
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }

    // ค้นหาตามช่วงราคา
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // เรียงลำดับ
    const sortOptions: any = {};
    if (sort) {
      sortOptions[sort] = order === 'desc' ? -1 : 1;
    }

    // ใช้ .exec() เพื่อรันคำสั่ง Query และคืนค่า
    return this.productModel.find(filter).sort(sortOptions).exec();
  }

  // --- ดึงข้อมูลรายตัว (Read One) ---
  async findOne(id: string): Promise<Product> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Product with ID ${id} not found (Invalid ID)`);
    }
    // await รอผลลัพธ์จากการค้นหาใน Database เพื่อเก็บลงตัวแปร product ไปตรวจสอบต่อ
    const product = await this.productModel.findById(id).exec();

    // ดัก Error: ถ้าหาไม่เจอ ให้โยน Error 404 ออกไป
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  // --- แก้ไขข้อมูล (Update) ---
  async update(id: string, updateProductDto: UpdateProductDto, files?: Array<Express.Multer.File>): Promise<Product> {
    console.log('--- Update Product ---');
    console.log('ID:', id);
    console.log('Files:', files?.map(f => f.path));

    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Product with ID ${id} not found (Invalid ID)`);
    }

    const newImageUrls = files
      ? files.map(file => this.toPublicImagePath(file.path.replace(/\\/g, '/')))
      : [];

    try {
      // 1. หาข้อมูลเก่าก่อน
      const oldProduct = await this.productModel.findById(id).exec();
      if (!oldProduct) {
        throw new NotFoundException(`Product with ID ${id} not found`);
      }

      // 2. ถ้ามีการอัปโหลดรูปใหม่ -> ลบรูปเก่าทั้งหมด (Policy: Replace All)
      // หรือจะทำ Logic Append ก็ได้ตามต้องการ (ในที่นี้ทำ Replace)
      if (newImageUrls.length > 0 && oldProduct.imageUrls?.length) {
        await Promise.all(
          oldProduct.imageUrls.map(url => safeUnlinkByRelativePath(url))
        );
      }

      // 3. เตรียมข้อมูลที่จะ Update
      const updateData: any = { ...updateProductDto };
      if (newImageUrls.length > 0) {
        updateData.imageUrls = newImageUrls;
      }

      const updatedProduct = await this.productModel
        .findByIdAndUpdate(
          id,
          updateData,
          { new: true }
        )
        .exec();

      return updatedProduct!;
    } catch (err) {
      if (files?.length) {
        await Promise.all(
          files.map(f => safeUnlinkByRelativePath(f.path.replace(/\\/g, '/')))
        );
      }
      throw new InternalServerErrorException('Update product failed');
    }
  }

  // --- ลบข้อมูล (Delete) ---
  async remove(id: string): Promise<Product> {
    if (!isValidObjectId(id)) {
      throw new NotFoundException(`Product with ID ${id} not found (Invalid ID)`);
    }

    // 1. Find product to get image URLs
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    // 2. Delete files from filesystem
    if (product.imageUrls && product.imageUrls.length > 0) {
      await Promise.all(
        product.imageUrls.map(url => safeUnlinkByRelativePath(url))
      );
    }

    // 3. Delete from database
    await this.productModel.findByIdAndDelete(id).exec();

    return product;
  }
  // --- Mock Data (Seeding) ---
  async generateMockData(): Promise<Product[]> {
    const products: any[] = [];
    for (let i = 1; i <= 10; i++) {
        products.push({
        name: `Product ${i}`,
        price: i * 1000,
        description: `Description for Product ${i}`,
        colors: ['Red', 'Blue', 'Green'].slice(0, i % 3 + 1),
        imageUrls: [`uploads/mock-product-${i}-1.jpg`, `uploads/mock-product-${i}-2.jpg`],
      });
    }
    return this.productModel.insertMany(products) as any;
  }
}

