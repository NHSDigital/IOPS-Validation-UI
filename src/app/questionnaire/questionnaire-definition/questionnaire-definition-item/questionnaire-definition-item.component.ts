import {Component, Input} from '@angular/core';
import {QuestionnaireItem} from "fhir/r4";
import {CommonModule} from "@angular/common";
import {Coding} from "fhir/r4";
import {MatChipsModule} from "@angular/material/chips";
import {MatAnchor} from "@angular/material/button";
import {MatTooltip} from "@angular/material/tooltip";
import {MatExpansionModule} from "@angular/material/expansion";

@Component({
  selector: 'app-questionnaire-definition-item',
  standalone: true,
  imports: [
    MatChipsModule,
      MatExpansionModule,
    CommonModule,
    MatAnchor,
    MatTooltip
  ],
  templateUrl: './questionnaire-definition-item.component.html',
  styleUrl: './questionnaire-definition-item.component.scss'
})
export class QuestionnaireDefinitionItemComponent {

  @Input()
  set node(item: QuestionnaireItem) {

    this.item = item;
  }

  item: QuestionnaireItem | undefined;

  getTerminologyUrl(code: Coding[]) {
    // Use base onto as NHS England and Scotland versions have issues.
    if (code.length>0 && code[0].code !== undefined) return "https://ontoserver.csiro.au/shrimp/?concept=" + code[0].code + "&valueset=http%3A%2F%2Fsnomed.info%2Fsct%3Ffhir_vs"
    else return "https://ontoserver.csiro.au/shrimp/?concept=138875005&valueset=http%3A%2F%2Fsnomed.info%2Fsct%3Ffhir_vs&fhir=https%3A%2F%2Fontology.nhs.uk%2Fauthoring%2Ffhir"
  }
  getTerminologyDisplay(code: Coding[]) : string {
     if (code.length>0 ) {
       var result = ""
       if (code[0].system !== undefined && code[0].system ==='http://snomed.info/sct') result += "SNOMED CT "
       if (code[0].code !== undefined) result += code[0].code+ " "
       if (code[0].display !== undefined) result += code[0].display+ " "
       return result
     }
     else return 'No display term present'
  }
}