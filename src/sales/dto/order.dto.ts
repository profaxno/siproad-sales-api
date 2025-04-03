import { IsArray, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

export class OrderCompanyDto {
  @IsUUID()
  id: string;

  @IsString()
  @MaxLength(50)
  name: string;

  constructor(id: string, name: string){
    this.id = id;
    this.name = name;
  }
}

export class OrderUserDto {
  @IsUUID()
  id: string;

  @IsString()
  @MaxLength(50)
  name: string;

  @IsString()
  @MaxLength(50)
  email: string;

  constructor(id: string, name: string, email: string){
    this.id = id;
    this.name = name;
    this.email = email;
  }
}

export class OrderDto {
  
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsUUID()
  companyId: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerIdDoc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  customerAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  comment?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
  
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPct?: number;
  
  @IsOptional()
  @IsInt()
  @Min(0)
  status?: number;

  @IsOptional()
  @IsString()
  createdAt?: string;

  @IsOptional()
  @Type(() => OrderCompanyDto)
  company?: OrderCompanyDto;

  @IsOptional()
  @Type(() => OrderUserDto)
  user?: OrderUserDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderProductDto)
  productList?: OrderProductDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  constructor(companyId: string, id?: string, code?: string, customerIdDoc?: string, customerName?: string, customerEmail?: string, customerPhone?: string, customerAddress?: string,  comment?: string, discount?: number, discountPct?: number, status?: number, createdAt?: string, company?: OrderCompanyDto, user?: OrderUserDto, productList?: OrderProductDto[], cost?: number, price?: number){
    this.companyId    = companyId;
    this.id           = id;
    this.code         = code;
    this.customerIdDoc = customerIdDoc;
    this.customerName = customerName;
    this.customerEmail = customerEmail;
    this.customerPhone = customerPhone;
    this.customerAddress = customerAddress
    this.comment      = comment;
    this.discount     = discount;
    this.discountPct  = discountPct;
    this.status       = status;
    this.createdAt    = createdAt;
    this.company      = company;
    this.user         = user;
    this.productList  = productList;
    this.cost         = cost;
    this.price        = price;
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
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code: string;

  @IsNumber()
  @Min(0)
  cost: number;

  @IsNumber()
  @Min(0)
  price: number;
  
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPct?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  status?: number;
  
  constructor(id: string, qty: number, name: string, cost: number, price: number, comment?: string, code?: string, discount?: number, discountPct?: number, status?: number){
    this.id = id;
    this.qty = qty;
    this.name = name;
    this.cost = cost;
    this.price = price;
    this.comment = comment;
    this.code = code;
    this.discount = discount;
    this.discountPct = discountPct;
    this.status = status;
  }
}