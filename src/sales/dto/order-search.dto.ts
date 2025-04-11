import { IsArray, IsOptional, IsString } from "class-validator";

export class OrderSearchInputDto {
  
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  customerNameIdDoc?: string;
  
  @IsOptional()
  @IsString()
  comment?: string;
  
  constructor(code?: string, customerNameIdDoc?: string, comment?: string) {
    this.code = code;
    this.customerNameIdDoc = customerNameIdDoc;
    this.comment = comment;
  }

}