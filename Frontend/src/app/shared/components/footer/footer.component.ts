import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, ShoppingCart, Facebook, Twitter, Instagram, Youtube, Phone, Mail, MapPin } from 'lucide-angular';

@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [CommonModule, RouterModule, LucideAngularModule],
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss']
})
export class FooterComponent {
    readonly ShoppingCart = ShoppingCart;
    readonly Facebook = Facebook;
    readonly Twitter = Twitter;
    readonly Instagram = Instagram;
    readonly Youtube = Youtube;
    readonly Phone = Phone;
    readonly Mail = Mail;
    readonly MapPin = MapPin;

    currentYear = new Date().getFullYear();
}
