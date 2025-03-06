import { IsNumber, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class ProductDto {
  
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  companyId: string;

  @IsString()
  @MaxLength(45)
  name: string;

  @IsNumber()
  cost: number;

  @IsNumber()
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description: string;

  @IsOptional()
  @IsUUID()
  productTypeId: string;

  constructor(companyId: string, name: string, cost: number, price: number, id?: string, description?: string, productTypeId?: string) {
    this.companyId = companyId;
    this.name = name;
    this.cost = cost;
    this.price = price;
    this.id = id;
    this.description = description;
    this.productTypeId = productTypeId;
  }
}