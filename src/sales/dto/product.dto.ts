import { IsNumber, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class ProductDto {
  
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsOptional()
  @IsUUID()
  productTypeId?: string;

  @IsUUID()
  companyId: string;

  @IsString()
  @MaxLength(45)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imagenUrl?: string;

  constructor(companyId: string, name: string, price: number, id?: string, productTypeId?: string, description?: string, imagenUrl?: string) {
    this.companyId = companyId;
    this.name = name;
    this.price = price;
    this.id = id;
    this.productTypeId = productTypeId;
    this.description = description;
    this.imagenUrl = imagenUrl;
  }
}