import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Company, User, OrderProduct } from "./";

@Entity("sal_order")
export class Order {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50 })
  code: string;
  
  @Column('varchar', { length: 50, nullable: true })
  customerIdDoc: string;

  @Column('varchar', { length: 50, nullable: true })
  customerName: string;

  @Column('varchar', { length: 50, nullable: true })
  customerEmail: string;

  @Column('varchar', { length: 50, nullable: true })
  customerPhone: string;

  @Column('varchar', { length: 150, nullable: true })
  customerAddress: string;

  @Column('varchar', { length: 250, nullable: true })
  comment: string;

  @Column('double', { default: 0 })
  discount: number;

  @Column('double', { default: 0 })
  discountPct: number;

  @Column('tinyint', { default: 1, unsigned: true })
  status: number;

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
    () => User,
    (user) => user.order,
    { eager: true }
  )
  user: User;

  @OneToMany(
    () => OrderProduct,
    (orderProduct) => orderProduct.order,
    { eager: true }
  )
  orderProduct: OrderProduct[];

}
