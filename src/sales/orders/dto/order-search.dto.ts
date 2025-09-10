import { IsArray, IsOptional, IsString } from "class-validator";

export class OrderSearchInputDto {
  
  @IsOptional()
  @IsString()
  createdAtInit?: string;

  @IsOptional()
  @IsString()
  createdAtEnd?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  customerNameIdDoc?: string;
  
  @IsOptional()
  @IsString()
  comment?: string;
  
  constructor(createdAtInit?: string, createdAtEnd?: string, code?: string, customerNameIdDoc?: string, comment?: string) {
    this.createdAtInit = createdAtInit;
    this.createdAtEnd = createdAtEnd;
    this.code = code;
    this.customerNameIdDoc = customerNameIdDoc;
    this.comment = comment;
  }

}