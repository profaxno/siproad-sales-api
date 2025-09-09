import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("sal_sale_sequence")
export class SaleSequence {

  @PrimaryColumn('uuid')
  companyId: string;

  @Column({ type: 'int', unsigned: true })
  lastCode: number;

}