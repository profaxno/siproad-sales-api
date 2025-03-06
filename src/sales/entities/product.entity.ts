import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Company, ProductType } from "./";

@Entity("sal_product")
export class Product {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 45, unique: true })
  name: string;

  @Column('varchar', { length: 255, nullable: true })
  description: string;

  @Column('double')
  cost: number;

  @Column('double')
  price: number;

  @Column('boolean', { default: false })
  hasFormula: boolean

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column('boolean', { default: true })
  active: boolean

  @ManyToOne(
    () => Company,
    (company) => company.product,
    { eager: true }
  )
  company: Company;

  @ManyToOne(
    () => ProductType,
    (productType) => productType.product,
    { eager: true }
  )
  productType: ProductType;

}
