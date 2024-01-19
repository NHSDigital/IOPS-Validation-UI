import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {MatTableDataSource} from "@angular/material/table";
import {OperationOutcome, OperationOutcomeIssue, StructureDefinition} from "fhir/r4";
import {MatSort, Sort} from "@angular/material/sort";
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {LoadingMode, LoadingStrategy, LoadingType, TdLoadingService} from "@covalent/core/loading";
import {TdDialogService} from "@covalent/core/dialogs";

@Component({
  selector: 'app-resource-test',
  templateUrl: './resource-test.component.html',
  styleUrls: ['./resource-test.component.scss']
})
export class ResourceTestComponent implements OnInit {

  information : number = 0
  warning : number = 0
  error : number = 0
  // @ts-ignore
  dataSource: MatTableDataSource<OperationOutcomeIssue> ;
  displayedColumns  = ['issue','location','details', 'diagnostic'];
  data: any;

  @Input()
  resource: any = undefined ;

  @Input()
  fileName: string = 'Not Specified';

  @Input()
  imposeProfiles : any = false;

  @Input()
  profile: StructureDefinition | undefined;

  @ViewChild('hrSort') hrSort: MatSort | null | undefined;

  //validateUrl = 'http://localhost:9001/FHIR/R4'
  validateUrl = 'https://3cdzg7kbj4.execute-api.eu-west-2.amazonaws.com/poc/Conformance/FHIR/R4'

  loadingMode = LoadingMode;
  loadingStrategy = LoadingStrategy;
  loadingType = LoadingType;

  overlayStarSyntax = false;
  constructor(
      private http: HttpClient,
      private _dialogService: TdDialogService,
      private _loadingService: TdLoadingService) { }

  ngOnInit(): void {
    if (this.resource !== undefined) {

      let headers = new HttpHeaders(
      );
      this.data = JSON.stringify(this.resource, undefined, 2)
      this.resource = JSON.parse(this.data)
      headers = headers.append('Content-Type', 'application/json');
      var url: string = this.validateUrl + '/$validate';
      if (this.profile !== undefined) url = url + '?profile='+this.profile.url
      console.log(this.imposeProfiles)
      if (this.imposeProfiles) {
        if (url.endsWith('validate')) {
          url = url + '?imposeProfile=true'
        } else{
          url = url + '&imposeProfile=true'
        }
      }
      this._loadingService.register('overlayStarSyntax');
      this.http.post(url, this.data,{ headers}).subscribe(result => {
            this._loadingService.resolve('overlayStarSyntax');
            if (result !== undefined) {
              var parameters = result as OperationOutcome
              this.information= 0
              this.warning  = 0
              this.error = 0
              for(let issue of parameters.issue) {
                this.fixLocation(issue)
                switch (issue.severity) {
                  case "information": {
                    this.information++
                    break
                  }
                  case "warning": {
                    this.warning++
                    break
                  }
                  default: {
                    this.error++
                  }
                }
              }

              this.dataSource = new MatTableDataSource<OperationOutcomeIssue>(parameters.issue)
              this.setSortHR()

            }
          },
          error => {
            this._loadingService.resolve('overlayStarSyntax');
            console.log(JSON.stringify(error))
            this._dialogService.openAlert({
              title: 'Alert',
              disableClose: true,
              message:
                  this.getErrorMessage(error),
            });
          })
    }
  }
  announceSortChange($event: Sort) {

  }
  setSortHR() {

    // @ts-ignore
    this.dataSource.sort = this.hrSort

    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'issue': {
          switch(item.severity) {
            case "error": return 2
            case "fatal": return 3
            case "warning":return 1
            default: return 0
          }
        }
        case 'location': {
          if (item.location !== undefined) return item.location[0]
          return 0
        }
        case 'details' : {
          if (item.details !== undefined
              && item.details.coding !== undefined
              && item.details.coding.length > 0
              && item.details.coding[0].code !== undefined) return item.details.coding[0].code
          return 0
        }

        default: {
          return 0
        }
      }
    };
  }

  getErrorMessage(error: any) {
    var errorMsg = ''
    if (error.error !== undefined){

      if (error.error.issue !== undefined) {
        errorMsg += ' ' + error.error.issue[0].diagnostics
      }
    }
    errorMsg += '\n\n ' + error.message
    return errorMsg;
  }



  private fixLocation( issue: OperationOutcomeIssue) :OperationOutcomeIssue {
    /*
    * THIS IS GOING TO BE REALLY COARSE but better than nothing */
    var newRow : number | undefined = undefined
    var newCol : number | undefined = undefined
    var lines = this.data.split(/\r?\n|\r|\n/g);
    if (issue.location !== undefined && issue.location.length>0) {
      var location = issue.location[0].split(".")[1]
      if (location !== undefined) {
        var arrayNumber : number | undefined = undefined
        if (location.split('[').length>1) {
          arrayNumber = +(location.split('[')[1].split(']')[0])
        }
        location = location.split('[')[0]

        // console.log(location)
        var found = false
        var inArray = false
        lines.forEach(( value: string,index: number) => {
              //console.log(value.trim().replace('\"',''))

              if (!found && (
                  (value.trim().replace('\"','').startsWith(location))
                  ||
                  (inArray && value.startsWith('    {')))
              ) {
                if (arrayNumber === undefined) {
                  found = true
                  newRow = index + 1
                  newCol = 0
                } else {
                  if (0 === arrayNumber) {
                    found = true
                    newRow = index + 1
                    newCol = 0
                  } else {
                    inArray = true
                    if (value.includes('{')) arrayNumber--

                  }
                }
              }
            }
        )
        if (issue.extension !== undefined) {
          if (newRow !== undefined && newCol !== undefined) {
            for (let extension of issue.extension) {
              if (extension.url === 'http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-col') {
                extension.valueInteger = newCol
              }
              if (extension.url === 'http://hl7.org/fhir/StructureDefinition/operationoutcome-issue-row') {
                extension.valueInteger = newRow
              }
            }
            if (issue.location !== undefined && issue.location.length > 1) {
              issue.location[1] = 'Line[' + newRow + '] Col[' + newCol + ']'
            }
          } else {
            if (issue.location !== undefined && issue.location.length > 1) {
              issue.location[1] = ''
            }
          }
        }
      }
    }

    return issue
  }


}