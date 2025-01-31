import {Component, OnInit, ViewChild} from '@angular/core';
import {MatCard, MatCardContent, MatCardHeader} from "@angular/material/card";
import {MatFormField, MatHint, MatLabel} from "@angular/material/form-field";
import {MatInput, MatInputModule} from "@angular/material/input";
import {CdkTextareaAutosize} from "@angular/cdk/text-field";
import {MatButton, MatIconButton} from "@angular/material/button";
import {ConceptDisplayComponent} from "../concept/concept-display/concept-display.component";
import {
    MatCell,
    MatCellDef,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow, MatRowDef, MatTable, MatTableDataSource, MatTableModule
} from "@angular/material/table";
import {MatIcon} from "@angular/material/icon";
import {MatPaginator} from "@angular/material/paginator";
import {AsyncPipe, NgForOf, NgIf} from "@angular/common";
import {Coding, QuestionnaireItemAnswerOption, ValueSet, ValueSetExpansionContains} from "fhir/r4";
import {ConfigService} from "../config.service";
import {HttpClient} from "@angular/common/http";
import {FormsModule} from "@angular/forms";
import {InfoDiaglogComponent} from "../info-diaglog/info-diaglog.component";
import {MatDialog} from "@angular/material/dialog";
import {
    MatAutocomplete,
    MatAutocompleteTrigger,

} from "@angular/material/autocomplete";

import {MatSelectModule} from "@angular/material/select";
import {SnomedEclPickerComponent} from "./snomed-ecl-picker/snomed-ecl-picker.component";
import eclModel from "../eclModel"
import {MatCheckbox} from "@angular/material/checkbox";

@Component({
    selector: 'app-ecl-builder',
    standalone: true,
    imports: [
        MatCard,
        MatLabel,
        MatCardContent,
        MatCardHeader,
        MatFormField,
        MatInputModule,
        MatSelectModule,
        CdkTextareaAutosize,
        MatButton,
        ConceptDisplayComponent,
        MatCell,
        MatCellDef,
        MatColumnDef,
        MatHeaderCell,
        MatHeaderRow,
        MatHeaderRowDef,
        MatIcon,
        MatPaginator,
        MatRow,
        MatHint,
        MatRowDef,
        MatTableModule,
        NgIf,
        FormsModule,
        MatAutocomplete,
        AsyncPipe,
        MatAutocompleteTrigger,
        NgForOf,
        MatIconButton,
        SnomedEclPickerComponent,
        MatCheckbox
    ],
    templateUrl: './ecl-builder.component.html',
    styleUrl: './ecl-builder.component.scss'
})
export class EclBuilderComponent {

    displayedColumns: string[] = ['code', 'display',];

    statements: eclModel[] = [
        {
            position: 0,
            action: undefined,
            operator: " ",
            concept: undefined,
            andor: undefined
        }
    ]

    dataSource: MatTableDataSource<Coding> = new MatTableDataSource<Coding>([]);

    @ViewChild(MatPaginator) paginator: MatPaginator | undefined;
    ecl: string = '';
    answerValueSetURI: string | undefined
    canExecute = false;
    excludeStatements: eclModel[] = [];
    excluded: boolean = false;

    constructor(private config: ConfigService,
                private http: HttpClient,
                public dialog: MatDialog
    ) {
    }

    getAnswerValueSetUri() {
        var worker = ''
        // remove comments
        let ecls = this.ecl.split('|')
        var index = 0
        ecls.forEach(value => {
            if ((index % 2) == 0) {
                worker += value.replace(' ', '')
            }
            index++
        })

        this.answerValueSetURI = 'http://snomed.info/sct/900000000000207008?fhir_vs=ecl%2F' + encodeURI(worker)
    }

    execute() {
        this.dataSource = new MatTableDataSource<Coding>([]);
        if (this.ecl !== undefined) {
            this.getAnswerValueSetUri()

            this.http.get(this.config.sdcServer() + '/ValueSet/\$expand?url=' + this.answerValueSetURI).subscribe((result) => {
                    const valueSet = result as ValueSet
                    if (valueSet.resourceType === 'ValueSet') {

                        if (valueSet.expansion !== undefined && valueSet.expansion.contains !== undefined && valueSet.expansion.contains.length > 0) {
                            var answers: Coding[] = []
                            for (let entry of valueSet.expansion.contains) {
                                const answer: Coding = {
                                    code: entry.code,
                                    system: entry.system,
                                    display: entry.display
                                }
                                answers.push(answer)
                            }

                            this.dataSource = new MatTableDataSource<Coding>(answers)
                            if (this.paginator !== undefined) this.dataSource.paginator = this.paginator
                        }
                    }
                },
                (error) => {
                    console.log(error)
                    this.openAlert('Alert', this.config.getErrorMessage(error))
                })
        }
    }

    openAlert(title: string, information: string) {
        let dialogRef = this.dialog.open(InfoDiaglogComponent, {
            width: '400px',
            data: {
                information: information,
                title: title
            }
        });

    }


    addEcl(ecl: eclModel, exclude: boolean) {


        var canExecute = true
        var eclStatementMaster = ''
        for (let statementType of ['include', 'exclude']) {
            var newEcl: eclModel[] = []
            var index = 0
            var eclStatement = ''
            var statements = this.statements

            if (statementType === 'exclude') statements = this.excludeStatements

            for (let eclStatement of statements) {
                if ((exclude && statementType === 'exclude') ||
                    (!exclude && statementType === 'include')) {

                    if (eclStatement.position === ecl.position) {
                        console.log('me match')
                        if (ecl.action === 'update') {
                            eclStatement.operator = ecl.operator
                            eclStatement.concept = ecl.concept
                            eclStatement.position = index

                            newEcl.push(eclStatement)
                            index++
                        } else if (ecl.action === 'remove') {
                            // leave item out of the new list
                        } else if (ecl.action === 'add') {
                            newEcl.push(eclStatement)
                            index++
                        }
                    } else {
                        console.log('me NO match')
                        newEcl.push(eclStatement)
                        index++
                    }
                    if (ecl.action === 'add') {
                        newEcl.push({
                            position: index,
                            action: undefined,
                            operator: " ",
                            concept: undefined,
                            andor: 'AND'
                        })
                    }
                } else {
                    // no processing should have occured
                    newEcl.push(eclStatement)
                    index++
                }
            }

            if (statementType === "include")
                this.statements = newEcl
            else
                this.excludeStatements = newEcl

            var index = 0


            for (let statement of statements) {
                if (statement.andor !== undefined) {
                    if (index > 0) {
                        eclStatement += statement.andor + ' '
                    } else {
                        statement.andor = undefined
                    }
                } else {
                    if (index > 0) canExecute = false
                }
                if (statement.operator !== undefined) {
                    eclStatement += statement.operator + ' '
                } else {
                    canExecute = false
                }
                if (statement.concept !== undefined) {
                    if (statement.concept.code !== undefined) {
                        eclStatement += statement.concept.code + ' '
                    }
                    if (statement.concept.display !== undefined) {
                        eclStatement += '|' + statement.concept.display + '| '
                    }
                } else {
                    canExecute = false
                }
                index++
            }

            if (this.excluded) {
                if (statementType === "include") {
                    eclStatementMaster = "(" + eclStatement + ")"
                } else {
                    eclStatementMaster += " MINUS (" + eclStatement + ")"
                }
            } else {
                if (statementType === "include") eclStatementMaster = eclStatement
                // No else as excluded not present
            }
        }

        this.ecl = eclStatementMaster
        this.canExecute = canExecute
        this.getAnswerValueSetUri()
        if (canExecute) this.execute()
    }

    searchType() {
        var ecl = this.ecl
        var canExecute = true
        var newEclList: eclModel[] = []
        var index = 0
        while (ecl.length > 0) {

            var eclModel: eclModel = {
                action: undefined, andor: undefined, concept: {
                    code: undefined,
                    display: undefined
                }, operator: " ", position: index
            }

            if (ecl.startsWith('OR ')) {
                ecl = this.remove(ecl, 'OR ')
                eclModel.andor = 'OR'
            }
            if (ecl.startsWith('AND ')) {
                ecl = this.remove(ecl, 'AND ')
                eclModel.andor = 'AND'
            }

            var worker = ecl.split('OR')[0].split('AND')[0]

            ecl = this.remove(ecl, worker)

            if (worker.startsWith('>>')) {
                worker = this.remove(worker, '>>')
                eclModel.operator = '>>'
            }
            if (worker.startsWith('>!')) {
                worker = this.remove(worker, '>!')
                eclModel.operator = '>!'
            }
            if (worker.startsWith('>')) {
                worker = this.remove(worker, '>')
                eclModel.operator = '>'
            }

            if (worker.startsWith('<<')) {
                worker = this.remove(worker, '<<')
                eclModel.operator = '<<'
            }
            if (worker.startsWith('<!')) {
                worker = this.remove(worker, '<!')
                eclModel.operator = '<!'
            }
            if (worker.startsWith('<')) {
                worker = this.remove(worker, '<')
                eclModel.operator = '<'
            }

            if (worker.startsWith('^')) {
                worker = this.remove(worker, '^')
                eclModel.operator = '^'
            }

            var concept = worker.trim().split(' ')[0].split('|')[0]

            if (concept !== '') {
                var code = concept
                var display = worker.trim().split('|')[1]
                eclModel.concept = {
                    code: code,
                    display: display
                }
            } else {
                canExecute = false
            }

            ecl = ecl.trim()

            index++
            newEclList.push(eclModel)
        }

        this.statements = newEclList
        this.canExecute = canExecute
        this.getAnswerValueSetUri()
        if (canExecute) this.execute()
    }

    remove(str: string, substring: string) {
        var position = str.lastIndexOf(substring, 0) + substring.length
        var retStr = str.substring(position)
        return retStr
    }

    exclude($event: MouseEvent) {

        if (this.excluded) {
            this.excludeStatements = [
                {
                    position: 0,
                    action: undefined,
                    operator: " ",
                    concept: undefined,
                    andor: undefined
                }
            ]
        } else {
            this.excludeStatements = []
        }
        this.addEcl({
            position: -1,
            action: undefined,
            operator: " ",
            concept: undefined,
            andor: undefined
        }, false)
    }
}
