import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "src/sales/users/entities/user.entity";
import { Order } from "src/sales/orders/entities/order.entity";

@Entity("sal_company")
export class Company {
  
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 50, unique: true })
  name: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
  
  @Column('boolean', { default: true })
  active: boolean

  @OneToMany(
    () => User,
    (user) => user.company
  )
  user: User;

  @OneToMany(
  () => Order,
  (order) => order.company
  )
  order: Order;

}
