import { IsNotEmpty, IsString, IsNumber, Min, IsOptional, IsArray } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateProductDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    @Type(() => Number) // แปลงจาก form-data (string) เป็น number
    price: number;

    @IsOptional()
    @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
    @IsString({ each: true })
    colors?: string[];

    @IsOptional()
    @IsString()
    description?: string;
}
