import { IsArray, IsOptional, IsString } from "class-validator";

export class ProductSearchInputDto {
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })  
  nameCodeList?: string[];
  
  @IsOptional()
  @IsString()
  productTypeId?: string;
  
  constructor(nameCodeList?: string[], productTypeId?: string) {
    this.nameCodeList = nameCodeList;
    this.productTypeId = productTypeId;
  }

}