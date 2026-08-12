import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';

class HeavyCalculator {
  calculate() {
    return 42;
  }
}

@Component({
  selector: 'app-hero',
  template: '<h1>Hero</h1>',
})
export class HeroComponent {
  subject = new BehaviorSubject<string>('init');
  form = new FormGroup({
    name: new FormControl(''),
  });

  processData() {
    // Should be flagged as dip/direct-instantiation because HeavyCalculator is not an excluded value/exception
    const calc = new HeavyCalculator();
    return calc.calculate();
  }
}
