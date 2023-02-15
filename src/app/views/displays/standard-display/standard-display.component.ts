import { AfterContentInit, AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { HelperService } from 'src/app/services/helpers/helper.service';

@Component({
  selector: 'display-standard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './standard-display.component.html',
  styleUrls: ['./standard-display.component.scss']
})
export class StandardDisplayComponent implements OnInit, AfterViewInit {
  @Input() resizeEvent$!: Observable<Event>;

  @ViewChild('displayCanvas') private canvas: ElementRef<HTMLCanvasElement> | undefined;

  constructor(private helperService: HelperService) { }

  ngOnInit(): void {
    this.resizeEvent$.subscribe(event => this.onResize(event));
  }

  ngAfterViewInit(): void {
    if(!this.canvas) return;

    const newSize = Math.min(window.innerWidth, window.innerHeight);

    this.canvas.nativeElement.style.width = `${newSize}px`;
    this.canvas.nativeElement.style.height = `${newSize}px`;
  }
  
  onResize(event: Event) {
    if(!event.target || !this.canvas) return;

    const newSize = Math.min((event.target as Window).innerWidth, (event.target as Window).innerHeight);

    this.canvas.nativeElement.style.width = `${newSize}px`;
    this.canvas.nativeElement.style.height = `${newSize}px`;
  }

  draw(): void {
    
  }

}
