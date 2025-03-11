import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from "class-validator";

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
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  description?: string;

  @IsNumber()
  @IsPositive()
  cost: number;
  
  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  imagenUrl?: string;

  // @IsOptional()
  // @IsBoolean()
  // active: boolean;

  constructor(companyId: string, name: string, price: number, id?: string, productTypeId?: string, description?: string, imagenUrl?: string/*, active?: boolean*/) {
    this.companyId = companyId;
    this.name = name;
    this.price = price;
    this.id = id;
    this.productTypeId = productTypeId;
    this.description = description;
    this.imagenUrl = imagenUrl;
    // this.active = active;
  }
}