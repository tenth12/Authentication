import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({ timestamps: true }) // เพิ่มวันที่สร้าง/แก้ไขให้อัตโนมัติ
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, min: 0, type: Number, default: 0 })
  price: number;

  @Prop({ type: [String] })
  colors: string[];

  @Prop()
  description: string;

  @Prop({ type: [String] }) // เก็บเป็น Array ของ String (Path ของไฟล์)
  imageUrls: string[];

}

export const ProductSchema = SchemaFactory.createForClass(Product);