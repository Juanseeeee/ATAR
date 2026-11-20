import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDirectConversationDto {
  /** Empresa proveedora con la que se quiere hablar. */
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  companyId!: string;
}
