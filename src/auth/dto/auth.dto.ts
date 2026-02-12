import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class AuthDto {
    @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
    email: string;

    @IsNotEmpty()
    @MinLength(8, { message: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' })
    password: string;
}
