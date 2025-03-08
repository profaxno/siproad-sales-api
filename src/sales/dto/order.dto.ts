import { ArrayNotEmpty, IsArray, IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class OrderDto {
  
  @IsUUID()
  @IsOptional()
  id?: string;

  @IsUUID()
  companyId: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  comment?: string;
  
  @IsOptional()
  @IsNumber()
  discount?: number;
  
  @IsOptional()
  @IsNumber()
  discountPct?: number;
  
  @IsOptional()
  @IsNumber()
  status?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  productList?: OrderProductDto[];

  constructor(companyId: string, id?: string, comment?: string, discount?: number, discountPct?: number, status?: number, productList?: OrderProductDto[]){
    this.companyId = companyId;
    this.id = id;
    this.comment = comment;
    this.discount = discount;
    this.discountPct = discountPct;
    this.status = status;
    this.productList = productList;
  }
}

export class OrderProductDto {
  @IsUUID()
  id: string;

  @IsNumber()
  @IsPositive()
  qty: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  comment?: string;

  @IsString()
  @MaxLength(45)
  name: string;

  @IsNumber()
  price: number;
  
  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  discountPct?: number;

  @IsOptional()
  @IsNumber()
  status?: number;
  
  constructor(id: string, qty: number, name: string, price: number, comment?: string, discount?: number, discountPct?: number, status?: number){
    this.id = id;
    this.qty = qty;
    this.name = name;
    this.price = price;
    this.comment = comment;
    this.discount = discount;
    this.discountPct = discountPct;
    this.status = status;
  }
}
