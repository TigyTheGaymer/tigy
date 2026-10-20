import { Pipe, type PipeTransform } from '@angular/core';
import { pieceTitle } from './format';

@Pipe({ name: 'pieceTitle' })
export class PieceTitlePipe implements PipeTransform {
  transform(title: string | undefined): string {
    return pieceTitle(title);
  }
}
