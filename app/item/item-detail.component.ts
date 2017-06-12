import { Page } from 'ui/page';
import { Component, OnInit } from "@angular/core";

@Component({
    selector: "ns-details",
    moduleId: module.id,
    templateUrl: "./item-detail.component.html",
})
export class ItemDetailComponent implements OnInit {

    constructor(private page: Page) {
        page.actionBarHidden = true;
    }

    ngOnInit(): void {

    }
}
