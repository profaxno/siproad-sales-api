import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Product } from "./";
import { ProductType } from "./product-type.entity";

@Entity("sal_company")
export class Company {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 45, unique: true })
  name: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
  
  @Column('boolean', { default: true })
  active: boolean

  @OneToMany(
    () => Product,
    (product) => product.company
  )
  product: Product;

  @OneToMany(
    () => ProductType,
    (productType) => productType.company
  )
  productType: ProductType;
}
