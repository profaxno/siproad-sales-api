import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class ProductSearchInputDto {
  
  @IsOptional()
  @IsArray()
  @IsString({ each: true })  
  nameCodeList?: string[];
  
  @IsOptional()
  @IsBoolean()
  enable4Sale?: boolean;

  @IsOptional()
  @IsString()
  productCategoryId?: string;
  
  constructor(nameCodeList?: string[], enable4Sale?: boolean, productTypeId?: string) {
    this.nameCodeList = nameCodeList;
    this.enable4Sale = enable4Sale;
    this.productCategoryId = productTypeId;
  }

}